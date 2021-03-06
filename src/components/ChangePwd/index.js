import React, { Component, Fragment } from 'react'
import { I18n } from 'react-redux-i18n'
import { connect } from 'react-redux'
import Input from 'components/Input'
import { Header } from 'components'
import Button from 'components/Button'
import utils from 'utils'
import hash from 'hash.js'
import * as accountActions from 'actions/accounts'

import './index.scss'

type Props = {

}

class AccountSetting extends Component<Props> {
  state = {
    currentPwd: '',
    newPwd: '',
    repeatNewPwd: '',
    isCurrentPwd: '',  // 输入当前密码是否正确
    isDifferent: false,  // 两次设置的新密码是否一致
  }
  handleChange = (e) => {
    this.setState({
      [e.target.name]: e.target.value,
    })
  }

  moveTo = (location) => () => {
    const { changeLocation } = this.props
    changeLocation(location)
  }

  onCheckCurrentPwd = async () => {
    const getEnPassword = () => new Promise((resolve, reject) => {
      chrome.storage.local.get(['password'],({password: en_password}) => {
        if(en_password){
          resolve(en_password)
        }else{
          reject()
        }
      })
    })
    const { currentPwd } = this.state
    try {
      const en_password = await getEnPassword()
      const _password = hash.sha256().update(currentPwd).digest('hex')
      if(_password === en_password){
        this.setState({
          isCurrentPwd: true
        })
      }else {
        this.setState({
          isCurrentPwd: false
        })
      }
      // utils.aesDecrypt(en_password, currentPwd)
      
    } catch (err) {
      this.setState({
        isCurrentPwd: false
      })
    }
  }

  onCheckNewPwd = () => {
    const { newPwd, repeatNewPwd } = this.state

    if (newPwd != repeatNewPwd) {
      this.setState({
        isDifferent: true
      })
    } else {
      this.setState({
        isDifferent: false
      })
    }
  }

  onUpdatePwd = () => {
    const { newPwd, currentPwd, isCurrentPwd, isDifferent } = this.state
    const reg = new RegExp(/^(?![^a-zA-Z]+$)(?!\D+$)/);
    if (!reg.test(newPwd)){
      return false;
    }
    if(!isCurrentPwd || isDifferent){
      return;
    }
    try {
      // const en_password = utils.aesEncrypt('account', newPwd)
      const en_password = hash.sha256().update(newPwd).digest('hex')
      chrome.storage.local.set({password: en_password})
      chrome.runtime.sendMessage({
        action: 'SET_PASSWORD',
        payload: {
          password: newPwd
        }
      })
      //重新设置账号列表
      chrome.storage.local.get(['accounts'], ({accounts}) => {
        if(accounts && accounts.length){
          accounts = accounts.map(item => {
            return {
              name: item.name,
              network: item.network,
              privateKey: utils.aesEncrypt(utils.aesDecrypt(item.privateKey, currentPwd), newPwd),
              publicKey: item.publicKey,
            }
          })
          chrome.storage.local.set({accounts: accounts},() =>{
            this.props.dispatch(accountActions.setAccounts(accounts));

            //修改当前账号
            chrome.storage.local.get(['activeAccount'], ({activeAccount}) => {
              if(activeAccount){
                activeAccount.privateKey = utils.aesEncrypt(utils.aesDecrypt(activeAccount.privateKey, currentPwd), newPwd)
                chrome.storage.local.set({ activeAccount: activeAccount },() => {
                  this.moveTo('/accountSetting')()
                })
              }
            })
            
          })
        }else {
          this.moveTo('/accountSetting')()
        }
      })
    } catch (err) {
      console.log(err)
    }

  }

  render() {
    const { currentPwd, newPwd, repeatNewPwd, isCurrentPwd, isDifferent } = this.state
    return (
      <Fragment>
        <Header title={I18n.t('Settings_changePwd')} onBack={this.moveTo('/accountSetting')} hasSetting={false} />
        <div className="changePwd-box">
          <Input
            name="currentPwd"
            type="password"
            onChange={this.handleChange}
            onBlur={this.onCheckCurrentPwd}
            className="input-pwd"
            placeholder={I18n.t('ChangePassword_CurrentPassword')}
          />
          {
            (currentPwd == '' || isCurrentPwd === '')? '': <p className={isCurrentPwd?'approved':'verify-error'}>{I18n.t(isCurrentPwd?'ChangePassword_Verification':'ChangePassword_Wrong')}</p>
          }
          <Input
            name="newPwd"
            type="password"
            onChange={this.handleChange}
            className="input-pwd"
            placeholder={I18n.t('ChangePassword_NewPassword')}
          />
          <Input
            name="repeatNewPwd"
            type="password"
            onChange={this.handleChange}
            className="input-pwd"
            placeholder={I18n.t('ChangePassword_Repeat')}
            onBlur={this.onCheckNewPwd}
          />
          {
            isDifferent ? <p className="verify-error">{I18n.t('ChangePassword_Wrong')}</p> : ''
          }
          <Button className="btn-setting" onClick={this.onUpdatePwd}>{I18n.t('Settings_changePwd')}</Button>
        </div>
      </Fragment>
    )
  }
}

const mapStateToProps = (state) => ({
  accounts: state.accounts.accounts,
})

export default connect(mapStateToProps)(AccountSetting)
